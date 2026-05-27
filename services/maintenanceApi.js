import { clearLocalStatsCache } from './statsApi.js';
import { callRpc } from './supabaseClient.js';

export function clearLocalMaintenanceData() {
    clearLocalStatsCache();
}

export async function clearSupabaseMaintenanceData(passcode) {
    if (!passcode) {
        throw new Error('Maintenance passcode is required.');
    }
    return callRpc('maintenance_clear_all', { p_passcode: passcode });
}
