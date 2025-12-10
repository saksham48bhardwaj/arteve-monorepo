'use client';

import { supabase } from '@arteve/supabase/client';

/* -------------------------------------------------------------------------- */
/*                               TYPES (Shared)                                */
/* -------------------------------------------------------------------------- */

export type PersonResult = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  genres: string[] | null;
};

export const PAGE_SIZE = 20;

function getRange(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { from, to };
}

/* -------------------------------------------------------------------------- */
/*                                 SEARCH: PEOPLE                             */
/* -------------------------------------------------------------------------- */

export async function searchPeople(
  query: string,
  page = 1
): Promise<PersonResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      handle,
      display_name,
      avatar_url,
      location,
      genres
    `
    )
    .eq('role', 'musician')
    .ilike('display_name', `%${query}%`)
    .range(from, to);

  if (error) throw error;
  return data ?? [];
}
