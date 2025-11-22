import { useState, useEffect, useRef } from 'react';

interface PollingOptions {
    interval?: number;
    maxAttempts?: number;
    backoffFactor?: number;
}

export function useTaskPolling<T>(
    taskFn: () => Promise<T | null>,
    checkCondition: (result: T) => boolean,
    options: PollingOptions = {}
) {
    const { interval = 2000, maxAttempts = 30, backoffFactor = 1.5 } = options;
    const [result, setResult] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const attemptsRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startPolling = () => {
        setIsPolling(true);
        setResult(null);
        setError(null);
        attemptsRef.current = 0;
        poll();
    };

    const stopPolling = () => {
        setIsPolling(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    const poll = async () => {
        if (attemptsRef.current >= maxAttempts) {
            setError(new Error('Polling timed out'));
            setIsPolling(false);
            return;
        }

        try {
            const data = await taskFn();
            attemptsRef.current++;

            if (data && checkCondition(data)) {
                setResult(data);
                setIsPolling(false);
            } else {
                const nextInterval = interval * Math.pow(backoffFactor, Math.min(attemptsRef.current, 5));
                timeoutRef.current = setTimeout(poll, nextInterval);
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Polling failed'));
            setIsPolling(false);
        }
    };

    useEffect(() => {
        return () => stopPolling();
    }, []);

    return { result, error, isPolling, startPolling, stopPolling };
}
