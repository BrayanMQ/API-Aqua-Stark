# Asset Upload System

Documentation for valid file types in the 2D sprite and 3D asset upload system.

## Supported File Types

### 2D Images
- **PNG** (`.png`) - `image/png`
- **JPEG** (`.jpg`, `.jpeg`) - `image/jpeg`, `image/jpg`
- **GIF** (`.gif`) - `image/gif`
- **WEBP** (`.webp`) - `image/webp`

### 3D Assets (Unity)
- **GLB** (`.glb`) - `model/gltf-binary`
- **GLTF** (`.gltf`) - `model/gltf+json`
- **FBX** (`.fbx`) - `application/octet-stream`
- **OBJ** (`.obj`) - `application/octet-stream` or `text/plain`

## File Size Limit

- **Maximum:** 10MB per file

## Usage

When implementing asset upload endpoints for new entities, use the same file type validation constants from `src/services/asset.service.ts` to maintain consistency across the codebase.
