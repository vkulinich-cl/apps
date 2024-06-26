import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { UIGCElement } from './base/UIGCElement';

import { computePosition } from '@floating-ui/dom';

import styles from './Popper.css';

@customElement('uigc-popper')
export class Popper extends UIGCElement {
  @property({ type: String }) text = null;

  static styles = [UIGCElement.styles, styles];

  override async firstUpdated() {
    const slotted = this.shadowRoot.querySelector('slot');
    const triggerElement = slotted.assignedElements()[0];
    const tooltipElement = this.shadowRoot.querySelector(
      '.tooltip',
    ) as HTMLElement;

    triggerElement.addEventListener('mouseover', () => {
      computePosition(triggerElement, tooltipElement, {
        placement: 'right-start',
      }).then(({ x, y }) => {
        Object.assign(tooltipElement.style, {
          display: 'block',
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    });

    triggerElement.addEventListener('mouseout', () => {
      Object.assign(tooltipElement.style, {
        display: 'none',
      });
    });
  }

  render() {
    return html`
      <slot></slot>
      <div class="tooltip">${this.text}</div>
    `;
  }
}
