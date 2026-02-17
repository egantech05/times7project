import { useEffect, useRef, useState } from "react";
import { fetchActiveTags, fetchReaderStatus } from "../services/gatewayClient";

export default function useActiveTags({ intervalMs = 1000 } = {}) {
  const [scans, setScans] = useState([]);
  const [gatewayStatus, setGatewayStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const [readerConnected, setReaderConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const [rows, readerStatus] = await Promise.all([
          fetchActiveTags(),
          fetchReaderStatus(),
        ]);
        if (!alive) return;

        setScans((rows ?? []).map((r) => ({
          ...r,
          id: String(r.tidHex).toUpperCase(),
        })));

        setReaderConnected(Boolean(readerStatus?.connected));
        setGatewayStatus("live");
        setError(null);
      } catch (e) {
        if (!alive) return;
        setGatewayStatus("error");
        setError(e?.message || String(e));
      }
    }

    tick();
    timerRef.current = setInterval(tick, intervalMs);

    return () => {
      alive = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return { scans, gatewayStatus, error, readerConnected };
}
