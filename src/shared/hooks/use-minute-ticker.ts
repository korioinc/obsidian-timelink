import { useEffect, useState } from 'preact/hooks';

export const useMinuteTicker = () => {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const tick = () => setNow(new Date());
		const intervalId = window.setInterval(tick, 60000);
		return () => window.clearInterval(intervalId);
	}, []);

	return now;
};
