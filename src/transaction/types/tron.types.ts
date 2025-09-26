export type TokenTransfer = {
  transaction_id: string;
  status: number;
  block_ts: number;
  from_address: string;
  from_address_tag: {};
  to_address: string;
  to_address_tag: {};
  block: number;
  contract_address: string;
  quant: string;
  confirmed: boolean;
  contractRet: string;
  finalResult: string;
  revert: boolean;
  tokenInfo: {
    tokenId: string;
    tokenAbbr: string;
    tokenName: string;
    tokenDecimal: number;
    tokenCanShow: number;
    tokenType: string;
    tokenLogo: string;
    tokenLevel: string;
    issuerAddr: string;
    vip: boolean;
  };
  contract_type: string;
  fromAddressIsContract: boolean;
  toAddressIsContract: boolean;
};

export type TronAccount = {
  address: TronAddress;
  privateKey: string;
  publicKey: string;
};

export type TronAddress = {
  base58: string;
  hex: string;
};
