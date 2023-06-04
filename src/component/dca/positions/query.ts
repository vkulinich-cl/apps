import { gql, request } from 'graphql-request';

const QUERY_SCHEDULED = gql`
  query ($who: String!) {
    events(where: { args_jsonContains: { who: $who }, AND: { name_eq: "DCA.Scheduled" } }, orderBy: block_height_DESC) {
      name
      args
      call {
        args
      }
      block {
        height
      }
    }
  }
`;

interface Scheduled {
  events: Array<{
    name: 'DCA.Scheduled';
    args: {
      id: number;
      who: string;
    };
    call: {
      args: {
        schedule: {
          order: {
            assetIn: string;
            amountIn: string;
            assetOut: string;
            minLimit: string;
            slippage: number;
          };
          owner: string;
          period: number;
          totalAmount: string;
        };
        startExecutionBlock: number;
      };
    };
  }>;
}

export async function queryScheduled(indexerUrl: string, who: string) {
  return await request<Scheduled>(indexerUrl, QUERY_SCHEDULED, {
    who: who,
  });
}

const QUERY_STATUS = gql`
  query ($who: String!) {
    events(
      where: { args_jsonContains: { who: $who }, AND: { name_in: ["DCA.Terminated", "DCA.Completed"] } }
      orderBy: block_height_DESC
    ) {
      name
      args
    }
  }
`;

interface Status {
  events: Array<{
    name: string;
    args: {
      id: number;
      who: string;
      error: any;
    };
  }>;
}

export async function queryStatus(indexerUrl: string, who: string) {
  return await request<Status>(indexerUrl, QUERY_STATUS, {
    who: who,
  });
}

const QUERY_TRADES = gql`
  query ($id: Int!) {
    events(
      where: { args_jsonContains: { id: $id }, AND: { name_in: ["DCA.TradeExecuted", "DCA.TradeFailed"] } }
      orderBy: block_height_DESC
    ) {
      name
      args
      block {
        height
        timestamp
      }
    }
  }
`;

interface Trades {
  events: Array<{
    name: string;
    args: {
      id: number;
      who: string;
      amountIn: string;
      amountOut: string;
      error: any;
    };
    block: {
      height: number;
      timestamp: string;
    };
  }>;
}

export async function queryTrades(indexerUrl: string, id: number) {
  return await request<Trades>(indexerUrl, QUERY_TRADES, {
    id: id,
  });
}

const QUERY_PLANNED = gql`
  query ($id: Int!) {
    events(
      where: { args_jsonContains: { id: $id }, AND: { name_eq: "DCA.ExecutionPlanned" } }
      orderBy: block_height_DESC
      limit: 1
    ) {
      name
      args
    }
  }
`;

interface Planned {
  events: Array<{
    name: string;
    args: {
      id: number;
      who: string;
      block: number;
    };
  }>;
}

export async function queryPlanned(indexerUrl: string, id: number) {
  return await request<Planned>(indexerUrl, QUERY_PLANNED, {
    id: id,
  });
}
