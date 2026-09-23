import { useState } from 'react';
import { AsumiHero } from './components/organisms/AsumiHero';
import { AsumiLoader } from './components/organisms/AsumiLoader';

export function AsumiApp() {
	const [heroActive, setHeroActive] = useState(false);
	const [showLoader, setShowLoader] = useState(true);

	return (
		<main className="asumi-app">
			<AsumiHero active={heroActive} />
			{showLoader ? (
				<AsumiLoader
					onComplete={() => setShowLoader(false)}
					onReveal={() => setHeroActive(true)}
				/>
			) : null}
		</main>
	);
}
