import SignalDetail from './SignalDetail';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <SignalDetail />;
}
