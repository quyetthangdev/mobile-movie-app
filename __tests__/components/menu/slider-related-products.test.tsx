import React from 'react'
import fs from 'fs'
import path from 'path'

it('SliderRelatedProducts is wrapped in memo()', () => {
  const filePath = path.join(
    __dirname,
    '../../../components/menu/slider-related-products.tsx',
  )
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  // Check that the default export uses memo()
  expect(fileContent).toMatch(/export default memo\(SliderRelatedProducts\)/)

  // Check that memo is imported
  expect(fileContent).toMatch(/import.*\bmemo\b.*from ['"]react['"]/)
})
