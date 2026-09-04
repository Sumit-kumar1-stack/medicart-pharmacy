import { redirect } from 'next/navigation';
import { currentUser } from './auth';
import { ADMIN_DASHBOARD_ROLES } from './permissions';
export async function requireAdminPage(){const user=await currentUser();if(!user)redirect('/login?next=/admin');if(!ADMIN_DASHBOARD_ROLES.includes(user.role))redirect('/');return user}
