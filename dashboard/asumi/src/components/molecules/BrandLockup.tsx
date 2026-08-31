import { BrandMark } from '../atoms/BrandMark';

export function BrandLockup() {
	return (
		<div className="brand-lockup">
			<BrandMark className="brand-lockup__wordmark" />
			<p className="brand-lockup__kanji">明日美</p>
			<p className="brand-lockup__english">A Beautiful Tomorrow</p>
			<p className="brand-lockup__persian">آینده ای روشن</p>
		</div>
	);
}
