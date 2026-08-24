/**
 * three.js (via @thatopen/components) defines GPUShaderStage as:
 *   typeof self !== "undefined" ? self.GPUShaderStage : { ... }
 * In browsers without WebGPU, self exists but GPUShaderStage does not, so the
 * bundle throws when WebGPU constants are evaluated at import time
 * (GPUShaderStage.VERTEX → "can't access property VERTEX of undefined").
 *
 * This module must be imported before any @thatopen / three.webgpu code.
 * index.html also installs the same stub before the module graph loads.
 */
const scope = globalThis as typeof globalThis & {
    GPUShaderStage?: {
        readonly VERTEX: number;
        readonly FRAGMENT: number;
        readonly COMPUTE: number;
    };
};

if (!scope.GPUShaderStage) {
    scope.GPUShaderStage = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
}
