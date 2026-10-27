// Converte 'AAAA-MM-DD' em 'DD/MM/AAAA' sem passar pelo fuso horário
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}