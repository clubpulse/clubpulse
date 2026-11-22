import { WITHIN_MILES, isAvailability, isRole, isStandard, type ConnectFilters } from './rules';

/** The filters a person can narrow by. Anything not recognised is ignored, never trusted. */
export function filtersFrom(get: (key: string) => string | null | undefined): ConnectFilters {
  const role = get('role'); const standard = get('standard'); const availability = get('availability'); const within = Number(get('within'));
  return {
    ...(isRole(role) ? { role } : {}), ...(isStandard(standard) ? { standard } : {}), ...(isAvailability(availability) ? { availability } : {}),
    ...((WITHIN_MILES as readonly number[]).includes(within) ? { within } : {}),
  };
}
