export const LandUseKeys = [
    'agriculture_farming',
    'ranching_livestock',
    'timber_forestry',
    'residential',
] as const

export type LandUseKey = (typeof LandUseKeys)[number]