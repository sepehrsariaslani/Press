import { BrandMark } from '../atoms/BrandMark';

export function BrandLockup() {
	return (
		<div className="brand-lockup">
			<h1 data-wordmark><BrandMark className="brand-lockup__wordmark" /></h1>
			<p className="brand-lockup__kanji" data-kanji>明日美</p>
			<p className="brand-lockup__english" data-copy>A Beautiful Tomorrow</p>
			<p className="brand-lockup__persian" data-copy>آینده ای روشن</p>
		</div>
	);
}
