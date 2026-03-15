import { describe, expect, test } from 'bun:test'
import { describeWithWorkspace } from '../../src/workspace-describe'

describeWithWorkspace('Job', './tests/runner', ctx => {
  describe('Foo', () => {
    test('foo', async () => {
      expect(true).toBe(true)
    })
  })
})
