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
            
            const player_count = Number(body.player_count) || 0;
            const max_players = Number(body.max_players) || 0;
            const steamids = body.steamids || [];

            let uniqueList = await env.STATS_DB.get("unique_operatives") || "";
            let playersSet = new Set(uniqueList.split(',').filter(id => id));
            if (Array.isArray(steamids)) steamids.forEach(id => playersSet.add(id));
            await env.STATS_DB.put("unique_operatives", Array.from(playersSet).join(','));

            const now = Date.now();
            let peakData = await env.STATS_DB.get("peak_stats", { type: "json" }) || { value: 0, lastReset: now };
            if (player_count > Number(peakData.value)) {
                peakData.value = player_count;
                await env.STATS_DB.put("peak_stats", JSON.stringify(peakData));
            }

            let rawChecks = await env.STATS_DB.get("total_checks");
            let rawSum = await env.STATS_DB.get("total_sum");
            
            let totalChecks = (Number(rawChecks) || 0) + 1;
            let newTotalSum = (Number(rawSum) || 0) + player_count;
            
            await env.STATS_DB.put("total_checks", totalChecks.toString());
            await env.STATS_DB.put("total_sum", newTotalSum.toString());
            
            const snapshot = {
                live: player_count,
                max_total: max_players,
                map: body.map_name || "Unknown",
                peak: peakData.value,
                avg: Math.round(newTotalSum / totalChecks),
                unique: playersSet.size
            };

            await env.STATS_DB.put("live_snapshot", JSON.stringify(snapshot));

            return new Response("Sync OK", { 
                status: 200, 
                headers: { "Access-Control-Allow-Origin": "*" } 
            });
        } catch (e) {
            console.error("CRASH ERROR:", e.message);
            return new Response("Worker Error: " + e.message, { status: 500 });
        }
    }

    const liveData = await env.STATS_DB.get("live_snapshot", { type: "json" }) || { live: 0, map: "N/A", max_total: 0 };
    return new Response(JSON.stringify(liveData), {
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache" 
        }
    });
}