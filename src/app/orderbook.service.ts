import { Injectable } from '@angular/core';
import { Headers, Http } from '@angular/http';
// import * as rx from 'rxjs';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import * as math from 'mathjs';

math.config({
  number: 'BigNumber',
  precision: 64
});

import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/map';

import { Order } from './order';
// import { ORDERS } from './mock-orderbook';

declare var electron: any;

@Injectable()
export class OrderbookService {
  public requestedOrder: Subject<Order> = new Subject();

  private orderbookObservable: Observable<Order>;

  private orderbookUrl = '';
  // private orderbookUrl = 'https://api-public.sandbox.gdax.com/products/ETH-BTC/book?level=2';

  constructor(private http: Http) {
    console.log('Constructing OrderbookService');
  }

  requestOrder(order: Order) {
    this.requestedOrder.next(order);
  }

  getOrderbook(): Observable<Order> {
    // this.orderbookUrl = 'api/orderbook_' + symbolsolejoin('_');

    // ToDo Connect orderbook.service to data API

    if(!this.orderbookObservable) {
      this.orderbookObservable = Observable.create(observer => {
        try {

          window.electron.ipcRenderer.on('orderBook', (e, orderBook) => {

            orderBook = Object.assign({}, orderBook, {
              asks: orderBook.asks.map(a => {
                return [a.price, a.size, a.orderId];
              }),
              bids: orderBook.bids.map(a => {
                return [a.price, a.size, a.orderId];
              }),
            });

            const p = Order.fromObject(orderBook);

            const asks = p.asks;
            const totalAskSize: number = asks.reduce((acc, curr) => {
              return acc + parseFloat(curr[1]);
            }, 0);

            for(const ask of asks) {
              // ask.push((parseFloat(ask[1]) / totalAskSize) * 100);
              ask.push(math
                .chain(parseFloat(ask[1]))
                .divide(totalAskSize)
                .multiply(100)
                .done()
              );
              ask.push('ask');
            }

            const bids = p.bids;
            const totalBidSize = asks.reduce((acc, curr) => {
              return acc + parseFloat(curr[1]);
            }, 0);

            for(const bid of bids) {
              // bid.push((parseFloat(bid[1]) / totalBidSize) * 100);
              bid.push(math
                .chain(parseFloat(bid[1]))
                .divide(totalBidSize)
                .multiply(100)
                .done()
              );
              bid.push('bid');
            }

            // console.log(p);

            observer.next(p);

          });

          electron.ipcRenderer.send('getOrderBook');

        } catch(err) {
          console.error(err);
        }
      });

    }
    return this.orderbookObservable;

    /*return this.http.get(this.orderbookUrl)
      .map((res) => {

        ////////////////////////////////////////////////////////////////////////
        // THIS IS NOT ELEGANT - FIX THIS!!! HAHA ~rsmith
        ////////////////////////////////////////////////////////////////////////

        const raw = res.json()[0];
        const p = Order.fromObject(raw);

        const asks = p.asks;
        const totalAskSize = asks.reduce((acc, curr) => {
          return acc + parseFloat(curr[1]);
        }, 0);

        asks.forEach((ask) => {
          ask.push((parseFloat(ask[1])/totalAskSize)*100);
          ask.push('ask');
        });

        ////////////////////////////////////////////////////////////////////////

        const bids = p.bids;
        const totalBidSize = asks.reduce((acc, curr) => {
          return acc + parseFloat(curr[1]);
        }, 0);

        bids.forEach((bid) => {
          bid.push((parseFloat(bid[1])/totalBidSize)*100);
          bid.push('bid');
        });

        ////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////


        return p;
      });*/
    //  .toPromise()
    //  .then(response => response.json() as Order[])
    //  .catch(this.handleError);
  }

  // getOrderbook(): Observable<Order[]> {
  //   return this.http
  //     .get(this.orderbookUrl)
  //     .map((response) => response.json() as Order[]);
  // }

  private handleError(error: any): Promise<any> {
    console.error('An error occurred', error); // for demo purposes only
    return Promise.reject(error.message || error);
  }
}
