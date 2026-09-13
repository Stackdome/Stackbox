import { PageTitle } from '@/components/page-title'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main>
      <PageTitle>{title}</PageTitle>
    </main>
  )
}
