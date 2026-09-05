import csv
import json
import re
import time
import uuid
import sys
import os

def parse_cost(val):
    val = val.lower().strip()
    if not val or val == 'na' or 'none' in val:
        return 0, False # not included, just 0
    if 'included' in val or 'free' in val:
        return 0, True # included
    
    # extract digits for cost
    matches = re.findall(r'\d+', val.replace(',', ''))
    if matches:
        return int(matches[0]), False
    return 0, False

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 csvSeeddata_toJson.py <input.csv> <output.json>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        sys.exit(1)
        
    with open(input_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        
        parsed = []
        for row in reader:
            if not row or not any(row): continue
            
            try:
                row += [''] * (8 - len(row))
                
                timestamp_str = row[0]
                layout = row[1]
                rent_val = row[2]
                hood = row[3]
                util_val = row[4]
                park_val = row[5]
                found_note = row[6]
                short_note = row[7]
                
                # Create note
                note_parts = []
                if found_note and found_note.strip(): note_parts.append(found_note.strip())
                if short_note and short_note.strip(): note_parts.append(short_note.strip())
                full_note = ". ".join(note_parts).replace("\n", ".")
                if not full_note.strip():
                    full_note = "NA"
                
                rent, _ = parse_cost(rent_val)
                util_cost, utils_included = parse_cost(util_val)
                park_cost, park_included = parse_cost(park_val)
                
                # Check for double occupancy
                check_str = " ".join(row).lower()
                double_occ = "double occupancy" in check_str or "shared" in check_str or "double" in check_str
                
                # Parse timestamp
                try:
                    dt = time.strptime(timestamp_str, "%m/%d/%Y %H:%M:%S")
                    ts = int(time.mktime(dt) * 1000)
                except:
                    ts = int(time.time() * 1000)
                
                rec_id = f"seed_{ts}_{uuid.uuid4().hex[:6]}"
                
                utils_flag = utils_included
                parking_flag = park_included or park_cost > 0
                
                record = {
                    "_timestamp": ts,
                    "_user": {
                        "displayName": "Guest",
                        "handle": None,
                        "id": rec_id,
                        "profileImageUrl": None
                    },
                    "createdAt": ts,
                    "doubleOccupancy": double_occ,
                    "hood": hood,
                    "id": rec_id,
                    "isOwnPlace": True,
                    "layout": layout.replace('-', '/').strip(),
                    "note": full_note,
                    "parking": parking_flag,
                    "parkingCost": park_cost,
                    "rent": rent,
                    "utilityCost": util_cost,
                    "utils": utils_flag
                }
                
                parsed.append(record)
            except Exception as e:
                print(f"Error parsing row: {row}\n{e}")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, indent=2)
        
    print(f"Processed {len(parsed)} records. Output written to {output_path}")

if __name__ == '__main__':
    main()
