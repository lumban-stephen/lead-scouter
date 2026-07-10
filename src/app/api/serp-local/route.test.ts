import { describe, expect, it } from 'vitest'
import { normalizeLocalResults } from './route'

describe('normalizeLocalResults', () => {
  it('handles SerpApi local_results.places', () => {
    expect(normalizeLocalResults({
      places: [
        { title: 'ATX Dental', website: 'https://example.com', rating: 4.9, reviews: 12 },
        { title: 'No Site' },
      ],
    })).toEqual([
      {
        title: 'ATX Dental',
        website: 'https://example.com',
        rating: 4.9,
        reviews: 12,
        phone: null,
        address: null,
        type: null,
      },
    ])
  })

  it('still handles array results', () => {
    expect(normalizeLocalResults([{ title: 'Shop', website: 'https://shop.test' }])).toHaveLength(1)
  })
})
