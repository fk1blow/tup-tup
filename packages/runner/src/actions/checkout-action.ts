import type { Executor } from 'src/executor'

export class CheckoutAction {
  constructor(private executor: Executor) {}

  async checkout(dest = '/workspace') {
    const result = await this.executor.exec([
      'sh',
      '-c',
      `curl -sSL $CHECKOUT_SERVICE_URL \
          -H "Authorization: Bearer $CHECKOUT_SERVICE_TOKEN" \
          | unzip -q -d ${dest} -`,
    ])

    const code = await result.exitCode
    if (code !== 0) {
      throw new Error(`checkout failed with exit code ${code}`)
    }
  }
}
