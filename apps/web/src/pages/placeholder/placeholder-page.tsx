import { PageTitle } from '@/components/page-title'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageTitle>{title}</PageTitle>
    </div>
  )
}
