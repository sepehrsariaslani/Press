import { useState } from 'react';
import { AsumiHero } from './components/organisms/AsumiHero';
import { AsumiLoader } from './components/organisms/AsumiLoader';

export function AsumiApp() {
	const [ready, setReady] = useState(false);

	return (
		<main className="asumi-app">
			{ready ? null : <AsumiLoader onComplete={() => setReady(true)} />}
			<AsumiHero active={ready} />
		</main>
	);
}
