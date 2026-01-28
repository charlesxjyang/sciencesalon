import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // Find Charles Yang users
  const { data: users, error: findError } = await supabase
    .from('users')
    .select('orcid_id, name')
    .ilike('name', '%charles%');

  if (findError) {
    console.error('Error finding users:', findError);
    process.exit(1);
  }

  console.log('Found users:', users);

  if (!users || users.length === 0) {
    console.log('No matching users found');
    process.exit(0);
  }

  // Delete the user(s)
  for (const user of users) {
    console.log(`Deleting user: ${user.name} (${user.orcid_id})`);

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('orcid_id', user.orcid_id);

    if (deleteError) {
      console.error(`Error deleting ${user.orcid_id}:`, deleteError);
    } else {
      console.log(`Deleted ${user.name}`);
    }
  }
}

main();
