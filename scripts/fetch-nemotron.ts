/**
 * fetch-nemotron.ts
 *
 * One-time script to fetch 20,000 balanced records from the NVIDIA
 * Nemotron-Personas-USA dataset (1M rows) via the HuggingFace
 * datasets-server API. This provides increased variability for simulations.
 *
 * Run with: npm run fetch-data
 * Output:   src/data/nemotron-agents.json
 */

import fs from 'fs';
import path from 'path';

// ── Types matching the target Agent interface ──────────────────────

interface NemotronRow {
  uuid: string;
  persona: string;
  professional_persona: string;
  cultural_background: string;
  sex: string;
  age: number;
  marital_status: string;
  education_level: string;
  bachelors_field: string;
  occupation: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

interface Agent {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  education: 'High School or less' | 'Some College / Associate' | "Bachelor's Degree" | 'Postgraduate / Advanced';
  occupation: string;
  state: string;
  region: 'Northeast' | 'Midwest' | 'South' | 'West';
  city: string;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated';
  persona: string;
  culturalBackground: string;
  professionalPersona: string;
  statement: string;
}

// ── Constants ──────────────────────────────────────────────────────

const TOTAL_RECORDS = 20_000;
const DATASET_SIZE = 1_000_000;
const BATCH_SIZE = 100; // HF API max per request
const API_BASE = 'https://datasets-server.huggingface.co/rows';
const DATASET = 'nvidia/Nemotron-Personas-USA';
const CONFIG = 'default';
const SPLIT = 'train';

// US state abbreviation → full name
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico', VI: 'Virgin Islands'
};

// State → Census region
const STATE_REGIONS: Record<string, 'Northeast' | 'Midwest' | 'South' | 'West'> = {
  CT: 'Northeast', ME: 'Northeast', MA: 'Northeast', NH: 'Northeast', RI: 'Northeast',
  VT: 'Northeast', NJ: 'Northeast', NY: 'Northeast', PA: 'Northeast',
  IL: 'Midwest', IN: 'Midwest', MI: 'Midwest', OH: 'Midwest', WI: 'Midwest',
  IA: 'Midwest', KS: 'Midwest', MN: 'Midwest', MO: 'Midwest', NE: 'Midwest',
  ND: 'Midwest', SD: 'Midwest',
  DE: 'South', FL: 'South', GA: 'South', MD: 'South', NC: 'South', SC: 'South',
  VA: 'South', DC: 'South', WV: 'South', AL: 'South', KY: 'South', MS: 'South',
  TN: 'South', AR: 'South', LA: 'South', OK: 'South', TX: 'South',
  AZ: 'West', CO: 'West', ID: 'West', MT: 'West', NV: 'West', NM: 'West',
  UT: 'West', WY: 'West', AK: 'West', CA: 'West', HI: 'West', OR: 'West', WA: 'West',
  PR: 'South', VI: 'South'
};

// ── Mapping helpers ────────────────────────────────────────────────

function mapAgeGroup(age: number): Agent['ageGroup'] {
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  if (age <= 64) return '55-64';
  return '65+';
}

function mapEducation(level: string): Agent['education'] {
  switch (level) {
    case 'high_school':
    case 'less_than_high_school':
      return 'High School or less';
    case 'some_college':
    case 'associates':
      return 'Some College / Associate';
    case 'bachelors':
      return "Bachelor's Degree";
    case 'masters':
    case 'doctorate':
    case 'professional':
      return 'Postgraduate / Advanced';
    default:
      return 'High School or less';
  }
}

function mapMaritalStatus(status: string): Agent['maritalStatus'] {
  switch (status) {
    case 'never_married': return 'Single';
    case 'married_present':
    case 'married_absent': return 'Married';
    case 'divorced': return 'Divorced';
    case 'widowed': return 'Widowed';
    case 'separated': return 'Separated';
    default: return 'Single';
  }
}

function snakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => {
      // Keep small words lowercase unless first word
      const lower = word.toLowerCase();
      if (['or', 'and', 'of', 'the', 'in', 'for', 'a', 'an'].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/^\w/, c => c.toUpperCase()); // Ensure first char is uppercase
}

function extractNameFromPersona(persona: string): string {
  // Nemotron personas typically start with "FirstName LastName is a..."
  // or "FirstName LastName, a..."
  const match = persona.match(/^([A-Z][a-zA-Zéèñ'-]+)\s+([A-Z][a-zA-Zéèñ'-]+)/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return 'Unknown Person';
}

function mapRow(row: NemotronRow, index: number): Agent {
  const stateAbbr = row.state?.toUpperCase() || 'CA';
  const stateName = STATE_NAMES[stateAbbr] || row.state || 'Unknown';
  const region = STATE_REGIONS[stateAbbr] || 'West';
  const name = extractNameFromPersona(row.persona || row.professional_persona || '');
  const occupation = snakeCaseToTitleCase(row.occupation || 'worker');
  const gender = row.sex === 'Male' ? 'Male' : 'Female';
  const ageGroup = mapAgeGroup(row.age);
  const education = mapEducation(row.education_level);
  const maritalStatus = mapMaritalStatus(row.marital_status);

  const statement = `A ${row.age}-year-old ${gender.toLowerCase()} ${occupation.toLowerCase()} from ${row.city || 'unknown city'}, ${stateName}.`;

  return {
    id: `agent-${String(index + 1).padStart(5, '0')}`,
    name,
    gender,
    age: row.age,
    ageGroup,
    education,
    occupation,
    state: stateName,
    region,
    city: row.city || 'Unknown',
    maritalStatus,
    persona: (row.persona || '').slice(0, 500),
    culturalBackground: (row.cultural_background || '').slice(0, 500),
    professionalPersona: (row.professional_persona || '').slice(0, 500),
    statement
  };
}

// ── Fetching logic ────────────────────────────────────────────────

async function fetchBatch(offset: number, length: number): Promise<NemotronRow[]> {
  const url = `${API_BASE}?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
  
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'demographic-reaction-engine/1.0'
    },
    signal: AbortSignal.timeout(30_000)
  });

  if (!res.ok) {
    throw new Error(`HF API error at offset ${offset}: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.rows || []).map((r: any) => r.row as NemotronRow);
}

function generateRandomOffsets(count: number, batchSize: number, datasetSize: number): number[] {
  const offsets: Set<number> = new Set();
  const numBatches = Math.ceil(count / batchSize);
  
  // Generate random offsets spread across the dataset
  while (offsets.size < numBatches) {
    const offset = Math.floor(Math.random() * (datasetSize - batchSize));
    // Ensure offsets don't overlap (minimum batchSize apart)
    let tooClose = false;
    for (const existing of offsets) {
      if (Math.abs(existing - offset) < batchSize) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      offsets.add(offset);
    }
  }

  return Array.from(offsets).sort((a, b) => a - b);
}

// ── Balance validation ────────────────────────────────────────────

function validateBalance(agents: Agent[]): void {
  const total = agents.length;
  
  // Check gender balance
  const genderCounts: Record<string, number> = {};
  agents.forEach(a => { genderCounts[a.gender] = (genderCounts[a.gender] || 0) + 1; });
  console.log('\n📊 Gender Distribution:');
  Object.entries(genderCounts).forEach(([k, v]) => {
    console.log(`   ${k}: ${v} (${(v / total * 100).toFixed(1)}%)`);
  });

  // Check education balance
  const eduCounts: Record<string, number> = {};
  agents.forEach(a => { eduCounts[a.education] = (eduCounts[a.education] || 0) + 1; });
  console.log('\n📊 Education Distribution:');
  Object.entries(eduCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`   ${k}: ${v} (${(v / total * 100).toFixed(1)}%)`);
  });

  // Check region balance
  const regionCounts: Record<string, number> = {};
  agents.forEach(a => { regionCounts[a.region] = (regionCounts[a.region] || 0) + 1; });
  console.log('\n📊 Region Distribution:');
  Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`   ${k}: ${v} (${(v / total * 100).toFixed(1)}%)`);
  });

  // Check age group balance
  const ageCounts: Record<string, number> = {};
  agents.forEach(a => { ageCounts[a.ageGroup] = (ageCounts[a.ageGroup] || 0) + 1; });
  console.log('\n📊 Age Group Distribution:');
  Object.entries(ageCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => {
    console.log(`   ${k}: ${v} (${(v / total * 100).toFixed(1)}%)`);
  });

  // Check marital status balance
  const maritalCounts: Record<string, number> = {};
  agents.forEach(a => { maritalCounts[a.maritalStatus] = (maritalCounts[a.maritalStatus] || 0) + 1; });
  console.log('\n📊 Marital Status Distribution:');
  Object.entries(maritalCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`   ${k}: ${v} (${(v / total * 100).toFixed(1)}%)`);
  });
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Nemotron-Personas-USA Data Fetcher');
  console.log(`   Target: ${TOTAL_RECORDS.toLocaleString()} records from ${DATASET_SIZE.toLocaleString()} available`);
  console.log('');

  const offsets = generateRandomOffsets(TOTAL_RECORDS, BATCH_SIZE, DATASET_SIZE);
  const totalBatches = offsets.length;
  console.log(`📡 Will fetch ${totalBatches} batches of ${BATCH_SIZE} from random offsets...\n`);

  const allRows: NemotronRow[] = [];
  const seenUuids = new Set<string>();
  let failedBatches = 0;

  for (let i = 0; i < totalBatches; i++) {
    const offset = offsets[i];
    const batchNum = i + 1;

    try {
      const rows = await fetchBatch(offset, BATCH_SIZE);
      
      // Deduplicate
      for (const row of rows) {
        if (!seenUuids.has(row.uuid)) {
          seenUuids.add(row.uuid);
          allRows.push(row);
        }
      }

      if (batchNum % 20 === 0 || batchNum === totalBatches) {
        console.log(`   ✅ Batch ${batchNum}/${totalBatches} — ${allRows.length.toLocaleString()} unique records so far (offset: ${offset.toLocaleString()})`);
      }

      // Rate limit: small delay between requests
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (err: any) {
      failedBatches++;
      console.error(`   ❌ Batch ${batchNum} failed at offset ${offset}: ${err.message}`);
      
      if (failedBatches > 20) {
        console.error('\n⚠️  Too many failures. Stopping early.');
        break;
      }

      // Wait a bit longer after errors
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n📦 Fetched ${allRows.length.toLocaleString()} unique raw records (${failedBatches} batches failed)`);

  // Trim to target
  const trimmed = allRows.slice(0, TOTAL_RECORDS);
  console.log(`   Trimmed to ${trimmed.length.toLocaleString()} records`);

  // Map to Agent objects
  console.log('\n🔄 Mapping to Agent interface...');
  const agents = trimmed.map((row, idx) => mapRow(row, idx));

  // Validate balance
  validateBalance(agents);

  // Write output
  const outPath = path.join(process.cwd(), 'src', 'data', 'nemotron-agents.json');
  fs.writeFileSync(outPath, JSON.stringify(agents, null, 0)); // No indentation to save ~40% file size
  
  const fileSizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Wrote ${agents.length.toLocaleString()} agents to ${outPath}`);
  console.log(`   File size: ${fileSizeMB} MB`);
  console.log('\n🎉 Done! You can now run the app with: npm run dev');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
