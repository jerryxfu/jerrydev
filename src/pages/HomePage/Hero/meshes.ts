import type {Theme} from "@/context/ThemeContext.tsx";

// One gradient mesh per theme, by class (styles in src/assets/styles/, loaded by Hero.tsx). Also used by the horizon's
// reflection of the mesh (Seam/Horizon.tsx).
export const GRADIENT_MESHES: Record<Theme, string> = {
    light: "gradient-mesh-default",
    night: "gradient-mesh-night",
    blush: "gradient-mesh-blush",
    burgundy: "gradient-mesh-burgundy",
};
