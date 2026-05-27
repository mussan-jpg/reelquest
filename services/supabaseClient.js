export const SUPABASE_URL = 'https://wgzrwkrccfkbvqcixiik.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnenJ3a3JjY2ZrYnZxY2l4aWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDE2MDksImV4cCI6MjA5NTE3NzYwOX0.LZdQIDD_r8FgSZkPuclclypFvArgY2zRzP5pqtgxxR8';

function getHeaders(extra = {}) {
    return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...extra
    };
}

async function request(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: getHeaders(options.headers || {})
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase request failed: ${response.status} ${errorText}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

export async function insertRow(table, row) {
    return request(table, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row)
    });
}

export async function selectRows(table, query = '') {
    return request(`${table}${query}`);
}

export async function updateRows(table, query, patch) {
    return request(`${table}${query}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch)
    });
}

export async function callRpc(functionName, args = {}) {
    return request(`rpc/${functionName}`, {
        method: 'POST',
        body: JSON.stringify(args)
    });
}

export async function upsertRows(table, rows, onConflict) {
    const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
    return request(`${table}${query}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
    });
}
