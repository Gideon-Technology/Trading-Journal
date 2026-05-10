import EditTrade from './EditTrade';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <EditTrade />;
}
