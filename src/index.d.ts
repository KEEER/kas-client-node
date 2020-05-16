declare type KASClientClass =
  (new (options: { base: string, token: string }) => KASClientWithServiceToken) &
  (new (options: { base: string }) => KASClientWithoutServiceToken) &
  (new (base: string) => KASClientWithoutServiceToken)
declare const KASClient: KASClientClass
export = KASClient

interface KASUserInformation {
  avatar?: string
  nickname?: string
  keeerId?: string
  kredit: number
}
interface KASClientWithoutServiceToken {
  base: string
  getInformation (token: string): Promise<KASUserInformation>
}
interface KASClientWithServiceToken extends KASClientWithoutServiceToken {
  token: string
  getKiuid (token: string): Promise<string>
  pay (type: 'phone-number' | 'email' | 'keeer-id' | 'kiuid', identity: string, amount: number): Promise<void>
}
