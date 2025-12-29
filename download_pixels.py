import requests
import json
import time

BASE_URL = "https://ln.pixel.xx.kg/api"
CHUNK_SIZE = 999  # Slightly less than 1000 to be safe
SCAN_RANGE = 2000 # Initial scan range +/- from origin and activity points

def get_stats():
    try:
        response = requests.get(f"{BASE_URL}/stats")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return None

def get_activity():
    try:
        response = requests.get(f"{BASE_URL}/activity?limit=100")
        response.raise_for_status()
        return response.json().get('events', [])
    except Exception as e:
        print(f"Error fetching activity: {e}")
        return []

def get_pixels_chunk(x1, y1, x2, y2):
    try:
        response = requests.get(f"{BASE_URL}/pixels", params={'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})
        if response.status_code == 400:
             print(f"Bad request for {x1},{y1} to {x2},{y2}: {response.text}")
             return []
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching chunk {x1},{y1} to {x2},{y2}: {e}")
        return []

def main():
    print("Starting download...")
    
    # 1. Get Stats
    stats = get_stats()
    total_pixels_expected = stats.get('totalPixels', 0) if stats else 'Unknown'
    print(f"Total pixels expected: {total_pixels_expected}")

    # 2. Get Activity points to seed search
    activity = get_activity()
    seed_points = {(0, 0)} # Always start at origin
    for event in activity:
        seed_points.add((event['x'], event['y']))
    
    print(f"Found {len(seed_points)} seed points from activity.")

    # 3. Generate scan grid
    # We want to scan chunks of CHUNK_SIZE around each seed point
    # We'll use a set of visited chunks to avoid duplicate requests
    # Chunk key: (min_x, min_y) based on CHUNK_SIZE grid
    
    pixels_data = {} # (x,y) -> pixel_data
    visited_chunks = set()
    
    # Determine bounds to scan based on seeds
    # For now, let's just do a simple expansion around seeds
    
    chunks_to_scan = set()
    
    for px, py in seed_points:
        # Add a range of chunks around each seed
        # Calculate which chunk this point is in
        start_chunk_x = (px // CHUNK_SIZE) * CHUNK_SIZE
        start_chunk_y = (py // CHUNK_SIZE) * CHUNK_SIZE
        
        # Add this chunk and neighbors
        # Range covers approximately SCAN_RANGE/CHUNK_SIZE chunks in each direction
        range_chunks = SCAN_RANGE // CHUNK_SIZE + 1
        
        for dx in range(-range_chunks, range_chunks + 1):
            for dy in range(-range_chunks, range_chunks + 1):
                chunk_x = start_chunk_x + (dx * CHUNK_SIZE)
                chunk_y = start_chunk_y + (dy * CHUNK_SIZE)
                chunks_to_scan.add((chunk_x, chunk_y))

    print(f"Planned scan of {len(chunks_to_scan)} chunks.")
    
    for i, (cx, cy) in enumerate(chunks_to_scan):
        if (cx, cy) in visited_chunks:
            continue
            
        x2 = cx + CHUNK_SIZE - 1
        y2 = cy + CHUNK_SIZE - 1
        
        print(f"Scanning chunk {i+1}/{len(chunks_to_scan)}: ({cx}, {cy}) to ({x2}, {y2})...", end="\r")
        
        chunk_pixels = get_pixels_chunk(cx, cy, x2, y2)
        if chunk_pixels:
            for p in chunk_pixels:
                key = f"{p['x']},{p['y']}"
                if key not in pixels_data: # Avoid duplicates if chunks overlap (shouldn't with grid)
                     pixels_data[key] = p
        
        visited_chunks.add((cx, cy))
        time.sleep(0.1) # Be nice to the server

    print(f"\nScan complete. Downloaded {len(pixels_data)} distinct pixels.")
    
    if isinstance(total_pixels_expected, int):
        print(f"Coverage: {len(pixels_data) / total_pixels_expected * 100:.2f}% (approx)")

    # Save to file
    with open('pixels.json', 'w') as f:
        # Convert dictionary back to list values
        json.dump(list(pixels_data.values()), f, indent=2)
    
    print("Saved to pixels.json")

if __name__ == "__main__":
    main()
