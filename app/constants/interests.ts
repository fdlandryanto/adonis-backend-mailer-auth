export const InterestKeys = [
  'becoming_a_member',
  'receiving_more_information',
  'volunteering_partnering',
  'accessing_land_management',
  'regenerative_agriculture_principles',
  'heirs_property_assistance',
  'succession_planning_assistance',
] as const

export type InterestKey = (typeof InterestKeys)[number]