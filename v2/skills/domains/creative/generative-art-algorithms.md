# Generative Art Algorithms for Pixel Canvas (100x100)

Source: Curiosity Engine research, 2026-04-13

## 5 Techniques Ranked by Canvas Fit

### 1. Reaction-Diffusion (Gray-Scott) — BEST for organic pixel art
- Simulates chemical reactions creating spots, stripes, maze patterns
- Perfect for 100x100: each pixel = one cell, natural patterns emerge
- Parameters: feed rate, kill rate control pattern type
- Key params: dA=1.0, dB=0.5, feed=0.055, kill=0.062
- Visual: bioluminescent coral, organic textures
- Ref: karlsims.com/rd.html

### 2. Flow Fields (Perlin Noise) — BEST for data visualization
- Vector fields guide particles along organic paths
- Can encode canvas payment data as flow direction/magnitude
- 10x10 resolution grid for 100x100 canvas
- Trail effect with semi-transparent background creates river-like patterns
- Ref: p5.js noise(), OpenProcessing.org

### 3. Cellular Automata — BEST for emergent complexity
- Conway's Game of Life and variations
- Discrete states = natural fit for pixels
- Simple rules → complex patterns (gliders, oscillators, still lifes)
- Can color-code by age/state for gradient effects
- Ref: ksawerykomputery.com/tools/ca-generator

### 4. Floyd-Steinberg Dithering — BEST for photo-to-pixel conversion
- Error-diffusion algorithm creates illusion of color depth
- Distributes quantization error to neighbors (7/16, 3/16, 5/16, 1/16)
- Converts any image to limited palette pixel art
- Could dither canvas data visualizations into pixel-perfect outputs
- Ref: github.com/pillow0705/pixel-art-generator

### 5. Procedural Noise Patterns — BEST for ambient texture
- Perlin/Simplex noise at different octaves
- Can map noise values to color gradients
- Parameters: scale, octaves, persistence, lacunarity
- Good for backgrounds and atmosphere on canvas

## Data Visualization Applications

### Mapping Canvas Data to Algorithms
- **Payment flow → Flow field**: sats value = vector magnitude, color = direction
- **Color clusters → Reaction-diffusion**: seed each cluster center, let patterns emerge
- **Temporal activity → CA**: alive cells = recent activity, dead = stale pixels
- **Value distribution → Dithering**: map sats range to limited color palette
- **Spatial density → Noise**: density as height map, visualize as terrain

## Implementation Priority
1. Start with flow fields (easiest, most visual impact with data)
2. Then reaction-diffusion (most organic, most "artistic")
3. Then CA (most computationally interesting)
4. Dithering and noise as supporting techniques

## Key Insight
All 5 techniques work BECAUSE of low resolution, not despite it. At 100x100, each pixel carries weight. The constraint is the feature.
