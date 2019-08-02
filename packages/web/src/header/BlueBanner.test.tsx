import * as React from 'react'
import * as TestRenderer from 'react-test-renderer'
import BlueBanner from 'src/header/BlueBanner'

describe(BlueBanner, () => {
  it('has a max char limit of X', () => {
    const test = TestRenderer.create(<BlueBanner />)

    expect(test.getInstance()).toEqual(2)
  })
})
