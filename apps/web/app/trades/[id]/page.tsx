import TradeDetail from './TradeDetail';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <TradeDetail />;
}
