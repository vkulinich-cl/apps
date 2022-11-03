import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { choose } from 'lit/directives/choose.js';

import { baseStyles } from '../base.css';

import { DatabaseController } from '../db.ctrl';
import { Chain, chainCursor, readyCursor, accountCursor, transactionCursor } from '../db';
import { getPaymentInfo, signAndSend } from '../api/transaction';
import { getBestSell, getBestBuy } from '../api/trade';
import { getAssetsBalance, getAssetsPairs } from '../api/asset';
import { formatAmount } from '../utils/amount';
import { SYSTEM_ASSET_ID } from '../utils/chain';
import short from 'short-uuid';

import '../component/Paper';

import './trade/select-token';
import './trade/settings';
import './trade/trade-tokens';
import { Notification, NotificationType } from './notification-center';

import {
  TradeScreen,
  ScreenState,
  AssetsState,
  TradeState,
  DEFAULT_SCREEN_STATE,
  DEFAULT_ASSETS_STATE,
  DEFAULT_TRADE_STATE,
} from './trade.d';
import { bnum, PoolAsset, scale } from '@galacticcouncil/sdk';

@customElement('app-trade')
export class Trade extends LitElement {
  private chain = new DatabaseController<Chain>(this, chainCursor);
  private ro = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      this.screen.height = entry.contentRect.height;
    });
  });

  @state() screen: ScreenState = DEFAULT_SCREEN_STATE;
  @state() assets: AssetsState = DEFAULT_ASSETS_STATE;
  @state() trade: TradeState = DEFAULT_TRADE_STATE;

  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        max-width: 520px;
        margin-left: auto;
        margin-right: auto;
        position: relative;
      }

      ui-paper {
        width: 100%;
        display: block;
      }
    `,
  ];

  isSwapSelected(): boolean {
    return this.trade.assetIn != null && this.trade.assetOut != null;
  }

  isSwapEmpty(): boolean {
    return this.trade.amountIn == null && this.trade.amountOut == null;
  }

  isEmptyAmount(amount: string): boolean {
    return amount == '' || amount == '0';
  }

  hasError(): boolean {
    return this.trade.error != null;
  }

  changeScreen(active: TradeScreen) {
    this.screen.active = active;
    this.requestUpdate();
  }

  async calculateBestSell(assetIn: PoolAsset, assetOut: PoolAsset, amountIn: string) {
    const { trade, transaction, slippage } = await getBestSell(assetIn, assetOut, amountIn);
    this.trade = {
      ...this.trade,
      inProgress: false,
      assetIn: assetIn,
      assetOut: assetOut,
      afterSlippage: slippage,
      ...trade,
    };
    transactionCursor.reset(transaction);
    console.log(trade);
  }

  async calculateBestBuy(assetIn: PoolAsset, assetOut: PoolAsset, amountOut: string) {
    const { trade, transaction, slippage } = await getBestBuy(assetIn, assetOut, amountOut);
    this.trade = {
      ...this.trade,
      inProgress: false,
      assetIn: assetIn,
      assetOut: assetOut,
      afterSlippage: slippage,
      ...trade,
    };
    transactionCursor.reset(transaction);
    console.log(trade);
  }

  switchAndReCalculateSell() {
    this.trade = {
      ...this.trade,
      inProgress: true,
      assetIn: this.trade.assetOut,
      assetOut: this.trade.assetIn,
      balanceIn: this.trade.balanceOut,
      balanceOut: this.trade.balanceIn,
      amountIn: this.trade.amountOut,
      amountOut: null,
    };
    this.calculateBestSell(this.trade.assetIn, this.trade.assetOut, this.trade.amountIn);
  }

  switchAndReCalculateBuy() {
    this.trade = {
      ...this.trade,
      inProgress: true,
      assetIn: this.trade.assetOut,
      assetOut: this.trade.assetIn,
      balanceIn: this.trade.balanceOut,
      balanceOut: this.trade.balanceIn,
      amountIn: null,
      amountOut: this.trade.amountIn,
    };
    this.calculateBestBuy(this.trade.assetIn, this.trade.assetOut, this.trade.amountOut);
  }

  switchAssets() {
    if (!this.isSwapSelected() || this.isSwapEmpty()) {
      this.trade = {
        ...this.trade,
        assetIn: this.trade.assetOut,
        assetOut: this.trade.assetIn,
        balanceIn: this.trade.balanceOut,
        balanceOut: this.trade.balanceIn,
        amountIn: this.trade.amountOut,
        amountOut: this.trade.amountIn,
      };
    } else if (this.trade.assetOut.symbol == this.assets.active) {
      this.switchAndReCalculateSell();
    } else if (this.trade.assetIn.symbol == this.assets.active) {
      this.switchAndReCalculateBuy();
    }
  }

  changeAssetIn(previous: string, asset: PoolAsset) {
    const assetIn = asset;
    const assetOut = this.trade.assetOut;

    // Change without recalculation if amount not set or pair not specified
    if (assetOut == null || this.isSwapEmpty()) {
      this.trade = {
        ...this.trade,
        assetIn: asset,
        balanceIn: null,
      };
      return;
    }

    if (previous == this.assets.active) {
      this.trade = {
        ...this.trade,
        inProgress: true,
        assetIn: asset,
        balanceIn: null,
        amountOut: null,
      };
      this.calculateBestSell(assetIn, assetOut, this.trade.amountIn);
    } else {
      this.trade = {
        ...this.trade,
        inProgress: true,
        assetIn: asset,
        balanceIn: null,
        amountIn: null,
      };
      this.calculateBestBuy(assetIn, assetOut, this.trade.amountOut);
    }
  }

  changeAssetOut(previous: string, asset: PoolAsset) {
    const assetIn = this.trade.assetIn;
    const assetOut = asset;

    // Change without recalculation if amount not set or pair not specified
    if (assetIn == null || this.isSwapEmpty()) {
      this.trade = {
        ...this.trade,
        assetOut: asset,
        balanceOut: null,
      };
      return;
    }

    if (previous == this.assets.active) {
      this.trade = {
        ...this.trade,
        inProgress: true,
        assetOut: asset,
        balanceOut: null,
        amountIn: null,
      };
      this.calculateBestBuy(assetIn, assetOut, this.trade.amountOut);
    } else {
      this.trade = {
        ...this.trade,
        inProgress: true,
        assetOut: asset,
        balanceOut: null,
        amountOut: null,
      };
      this.calculateBestSell(assetIn, assetOut, this.trade.amountIn);
    }
  }

  clearAmounts() {
    this.trade = {
      ...this.trade,
      amountIn: null,
      amountOut: null,
      spotPrice: null,
      swaps: [],
    };
  }

  validateEnoughBalance(amount: string, asset: PoolAsset) {
    const assetBalance = this.assets.balance.get(asset.id);
    const assetAmount = scale(bnum(amount), assetBalance.decimals);
    if (assetAmount.gt(assetBalance.amount)) {
      this.trade.error = 'Your trade is bigger than your balance';
    } else {
      this.trade.error = null;
    }
  }

  updateAmountIn(amount: string) {
    // Wipe the trade info on input clear
    if (this.isEmptyAmount(amount)) {
      this.clearAmounts();
      return;
    }

    if (this.isSwapSelected()) {
      this.trade = {
        ...this.trade,
        inProgress: true,
        amountOut: null,
      };
      this.calculateBestSell(this.trade.assetIn, this.trade.assetOut, amount);
    } else {
      this.trade.amountIn = amount;
    }
  }

  updateAmountOut(amount: string) {
    // Wipe the trade info on input clear
    if (this.isEmptyAmount(amount)) {
      this.clearAmounts();
      return;
    }

    if (this.isSwapSelected()) {
      this.trade = {
        ...this.trade,
        inProgress: true,
        amountIn: null,
      };
      this.calculateBestBuy(this.trade.assetIn, this.trade.assetOut, amount);
    } else {
      this.trade.amountOut = amount;
    }
  }

  updateBalances() {
    const balanceIn = this.assets.balance.get(this.trade.assetIn?.id);
    const balanceOut = this.assets.balance.get(this.trade.assetOut?.id);
    this.trade = {
      ...this.trade,
      balanceIn: balanceIn && formatAmount(balanceIn.amount, balanceIn.decimals),
      balanceOut: balanceOut && formatAmount(balanceOut.amount, balanceOut.decimals),
    };
  }

  async syncBalances() {
    const account = accountCursor.deref();
    if (account) {
      this.assets.balance = await getAssetsBalance(account.address, this.assets.list);
      this.updateBalances();
    }
  }

  async syncTransactionFee() {
    const account = accountCursor.deref();
    const transaction = transactionCursor.deref();

    if (account && transaction) {
      const { partialFee } = await getPaymentInfo(transaction, account);
      this.trade.transactionFee = partialFee.toHuman();
      this.requestUpdate();
    }
  }

  notificationMessage(t: TradeState, status: string): string {
    return [t.type, t.amountIn, t.assetIn.symbol, 'for', t.amountOut, t.assetOut.symbol, status].join(' ');
  }

  notificationTemplate(trade: TradeState, status: string): TemplateResult {
    return html`
      <span>${trade.type}</span>
      <span class="highlight">${trade.amountIn}</span>
      <span class="highlight">${trade.assetIn.symbol}</span>
      <span>for</span>
      <span class="highlight">${trade.amountOut}</span>
      <span class="highlight">${trade.assetOut.symbol}</span>
      <span>${status}</span>
    `;
  }

  sendNotification(id: string, type: NotificationType, trade: TradeState, status: string) {
    const message = this.notificationTemplate(trade, status);
    const options = {
      bubbles: true,
      composed: true,
      detail: { id: id, timestamp: Date.now(), type: type, message: message } as Notification,
    };
    this.dispatchEvent(new CustomEvent<Notification>('trade-notification', options));
  }

  async swap(id: string, trade: TradeState) {
    const account = accountCursor.deref();
    const transaction = transactionCursor.deref();
    if (account && transaction) {
      signAndSend(
        transaction,
        account,
        ({ status }) => {
          const type = status.type.toLowerCase();
          switch (type) {
            case 'broadcast':
              this.sendNotification(id, NotificationType.progress, trade, 'broadcasted');
              break;
            case 'finalized':
              this.sendNotification(id, NotificationType.success, trade, 'done');
              break;
            case 'inblock':
              console.log(`Completed at block hash #${status.asInBlock.toString()}`);
              break;
          }
        },
        (error) => {
          this.sendNotification(id, NotificationType.error, trade, error.toString());
        }
      );
    }
  }

  async init() {
    const router = chainCursor.deref().router;
    const assets = await router.getAllAssets();
    const assetsPairs = await getAssetsPairs(assets);

    this.assets = {
      ...this.assets,
      list: assets,
      map: new Map<string, PoolAsset>(assets.map((i) => [i.id, i])),
      pairs: assetsPairs,
    };

    this.trade.assetIn = this.assets.map.get(SYSTEM_ASSET_ID);
    readyCursor.reset(true);
    // TODO: Remove once account selector(testing only)
    accountCursor.reset({
      address: 'bXmMqb3jBWToPPXf5RXWgRjFCk3eN9mM9Tqx8uj7MQ9vZ6HEx',
      provider: 'polkadot-js',
      name: 'testcoco',
    });
  }

  async subscribe() {
    const api = chainCursor.deref().api;
    await api.rpc.chain.subscribeNewHeads(async (lastHeader) => {
      console.log('Current block: ' + lastHeader.number.toString());
      this.syncBalances();
      this.syncTransactionFee();
      // TODO: Sync trade info
    });
  }

  override async updated() {
    if (this.chain.state && !readyCursor.deref()) {
      console.log('Initialization...');
      await this.init();
      await this.subscribe();
      console.log('Done ✅');
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.ro.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.ro.unobserve(this);
  }

  settingsTenplate() {
    return html`<app-settings
      style="height: ${this.screen.height}px"
      @back-clicked=${() => this.changeScreen(TradeScreen.TradeTokens)}
    ></app-settings>`;
  }

  selectTokenTenplate() {
    return html`<app-select-token
      style="height: ${this.screen.height}px"
      .assets=${this.assets.list}
      .pairs=${this.assets.pairs}
      .balances=${this.assets.balance}
      .assetIn=${this.trade.assetIn?.symbol}
      .assetOut=${this.trade.assetOut?.symbol}
      .selector=${this.assets.selector}
      @back-clicked=${() => this.changeScreen(TradeScreen.TradeTokens)}
      @asset-clicked=${(e: CustomEvent) => {
        const { id, asset } = this.assets.selector;
        id == 'assetIn' && this.changeAssetIn(asset, e.detail);
        id == 'assetOut' && this.changeAssetOut(asset, e.detail);
        this.updateBalances();
        this.changeScreen(TradeScreen.TradeTokens);
      }}
    ></app-select-token>`;
  }

  tradeTokensTenplate() {
    return html`<app-trade-tokens
      .assets=${this.assets.map}
      .inProgress=${this.trade.inProgress}
      .disabled=${!this.isSwapSelected() || this.isSwapEmpty() || this.hasError()}
      .tradeType=${this.trade.type}
      .assetIn=${this.trade.assetIn?.symbol}
      .assetOut=${this.trade.assetOut?.symbol}
      .amountIn=${this.trade.amountIn}
      .amountOut=${this.trade.amountOut}
      .balanceIn=${this.trade.balanceIn}
      .balanceOut=${this.trade.balanceOut}
      .spotPrice=${this.trade.spotPrice}
      .afterSlippage=${this.trade.afterSlippage}
      .priceImpactPct=${this.trade.priceImpactPct}
      .tradeFee=${this.trade.tradeFee}
      .tradeFeePct=${this.trade.tradeFeePct}
      .transactionFee=${this.trade.transactionFee}
      .error=${this.trade.error}
      .swaps=${this.trade.swaps}
      @asset-input-changed=${({ detail: { id, asset, value } }: CustomEvent) => {
        this.assets.active = asset;
        id == 'assetIn' && this.updateAmountIn(value);
        id == 'assetIn' && this.validateEnoughBalance(value, this.trade.assetIn);
        id == 'assetOut' && this.updateAmountOut(value);
        id == 'assetOut' && this.validateEnoughBalance(value, this.trade.assetOut);
      }}
      @asset-selector-clicked=${({ detail }: CustomEvent) => {
        this.assets.selector = detail;
        this.changeScreen(TradeScreen.SelectToken);
      }}
      @asset-switch-clicked=${this.switchAssets}
      @settings-clicked=${() => this.changeScreen(TradeScreen.Settings)}
      @swap-clicked=${() => {
        const transactionId = short.generate();
        this.swap(transactionId, this.trade);
      }}
    ></app-trade-tokens>`;
  }

  render() {
    return html`
      <ui-paper>
        ${choose(this.screen.active, [
          [TradeScreen.TradeTokens, () => this.tradeTokensTenplate()],
          [TradeScreen.Settings, () => this.settingsTenplate()],
          [TradeScreen.SelectToken, () => this.selectTokenTenplate()],
        ])}
      </ui-paper>
    `;
  }
}