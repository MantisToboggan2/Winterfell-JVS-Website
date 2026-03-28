export async function onRequest(context) {
    const { env, request } = context;

    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    if (request.method === "POST") {
        try {
            const body = await request.json();
            const now = new Date();
            
            const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
            const monthKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;

            let stats = await env.STATS_DB.get("winterfell_stats", { type: "json" }) || {
                unique_ids: [],
                peak: 0,
                total_checks: 0,
                total_sum: 0,
                daily: { key: "", sum: 0, count: 0 },
                weekly: { lastReset: Date.now(), sum: 0, count: 0 },
                monthly: { key: "", sum: 0, count: 0 },
                live: 0,
                max_total: 0,
                map: "Unknown"
            };

            // --- DATA MIGRATION CHECK (remove after 24 hours!!!) ---
            if (!stats.daily) stats.daily = { key: "", sum: 0, count: 0 };
            if (!stats.monthly) stats.monthly = { key: "", sum: 0, count: 0 };
            if (!stats.weekly) stats.weekly = { lastReset: Date.now(), sum: 0, count: 0 };
            // ------------------------------------------------

            const player_count = Number(body.player_count) || 0;
            const steamids = body.steamids || [];

            stats.live = player_count;
            stats.max_total = Number(body.max_players) || 0;
            stats.map = body.map_name || "Unknown";
            
            let playersSet = new Set(stats.unique_ids);
            if (Array.isArray(steamids)) {
                steamids.forEach(id => playersSet.add(id));
            }
            stats.unique_ids = Array.from(playersSet);

            if (player_count > stats.peak) stats.peak = player_count;

            stats.total_sum += player_count;
            stats.total_checks++;

            const updateBucket = (bucket, currentKey) => {
                if (bucket.key !== currentKey) {
                    bucket.key = currentKey;
                    bucket.sum = 0;
                    bucket.count = 0;
                }
                bucket.sum += player_count;
                bucket.count++;
            };

            updateBucket(stats.daily, dayKey);
            updateBucket(stats.monthly, monthKey);

            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            if ((Date.now() - stats.weekly.lastReset) > oneWeek) {
                stats.weekly = { lastReset: Date.now(), sum: 0, count: 0 };
            }
            stats.weekly.sum += player_count;
            stats.weekly.count++;

            await env.STATS_DB.put("winterfell_stats", JSON.stringify(stats));
            return new Response("Sync OK", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
        } catch (e) {
            return new Response("Worker Error: " + e.message, { status: 500 });
        }
    }

    const data = await env.STATS_DB.get("winterfell_stats", { type: "json" });
    if (!data) return new Response(JSON.stringify({ live: 0 }), { headers: { "Content-Type": "application/json" } });

    const calcAvg = (obj) => (obj && obj.count > 0 ? Math.round(obj.sum / obj.count) : 0);

    const responseData = {
        ...data,
        avg_daily: calcAvg(data.daily),
        avg_weekly: calcAvg(data.weekly),
        avg_monthly: calcAvg(data.monthly),
        avg_alltime: data.total_checks > 0 ? Math.round(data.total_sum / data.total_checks) : 0,
        unique: data.unique_ids ? data.unique_ids.length : 0
    };

    return new Response(JSON.stringify(responseData), {
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache" 
        }
    });
}