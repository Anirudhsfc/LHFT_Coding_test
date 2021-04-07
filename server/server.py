from gevent import monkey; monkey.patch_all()
from flask import Flask, Response, render_template, stream_with_context, request, make_response, jsonify
from gevent.pywsgi import WSGIServer
import json
import random
import time
import threading
import queue
from flask_cors import CORS, cross_origin
import pandas as pd


app = Flask(__name__)
cors = CORS(app)
# app.config['CORS_HEADERS'] = 'Content-Type'


class StockPriceGenerator():

    def __init__(self):
        self.update_frequency = 0
        self.elements_per_update = 0
        self.symbols = []
        self.update_timer = None
        self.batches = []
        self.current_batch = 0
        self.update_serial = 1
        self.historic_data = pd.DataFrame({}, columns=["timestamp", "symbol", "price"])

        # for passing events
        self.subscribers = []

    def load_config_file(self):
        with open('config_file.json') as json_file:
            data = json.load(json_file)
            self.symbols = data["symbols"]
            self.elements_per_update = float(data["elements_per_update"])
            self.update_frequency = float(data["update_frequency_milliseconds"])
    
    def configure_generator(self):
        i = 0
        curr_batch = []
        while (i<len(self.symbols)):
            curr_batch.append({
                "symbol":self.symbols[i],
                "price":0
            })
            i+=1

            if ((i%self.elements_per_update) == 0):
                self.batches.append(curr_batch)
                curr_batch = []
        if (len(curr_batch)!=0):
            self.batches.append(curr_batch)

    def generate_price_table(self):
        timestamp = time.time()
        data = []
        for i in range(len(self.batches[self.current_batch])):
            price = random.randint(0,10000)
            self.batches[self.current_batch][i]["price"] = price
            data.append({
                "timestamp": timestamp,
                "symbol":self.batches[self.current_batch][i]["symbol"],
                "price":self.batches[self.current_batch][i]["price"]
            })
        self.update_historic_data(data, timestamp)
        self.emit_prices()
    
    def update_historic_data(self, data, timestamp):
        five_old = timestamp - 300
        temp_df = pd.DataFrame(data, columns=["timestamp", "symbol", "price"]).append(self.historic_data, ignore_index=True)
        temp_df = temp_df[temp_df.timestamp > five_old]
        self.historic_data = temp_df
        
    def start_timer(self):
        self.generate_price_table()
        self.update_timer = threading.Timer(self.update_frequency/1000, self.start_timer)
        self.update_timer.start()

    def get_data_time_range(self, start, end):
        end_timestamp = time.time() - (end*60)
        start_timestamp = time.time() - (start*60)


        temp = self.historic_data[(self.historic_data.timestamp>=end_timestamp) & (self.historic_data.timestamp<=start_timestamp)]
        return temp.values.tolist()

    def stop_timer(self):
        if self.update_timer:
            self.update_timer.cancel()

    def emit_prices(self):
        msg = f'data: {json.dumps(self.batches[self.current_batch])}\n\n' 
        self.publish(msg)
        self.current_batch +=1 
        self.current_batch %= len(self.batches)

    def subscribe(self):
        self.subscribers.append(queue.Queue(maxsize=1))
        return self.subscribers[-1]
    
    def publish(self, msg):
        for i in reversed(range(len(self.subscribers))):
            try:
                self.subscribers[i].put_nowait(msg)
            except queue.Full:
                del self.subscribers[i]
        self.update_serial+=1


price_gen = StockPriceGenerator()
price_gen.load_config_file()
price_gen.configure_generator()
price_gen.start_timer()


@app.route("/updateFrequency", methods = ['POST'])
# @cross_origin()
def change_update_frequency():
    if request.method == 'POST':
        freq = float(json.loads(request.data)["frequency"])
        if freq > 0:
            price_gen.update_frequency = freq
        return "True", 200

@app.route("/getData", methods = ['POST'])
# @cross_origin()
def get_data():
    if request.method == 'POST':
        start = float(json.loads(request.data)["start"])
        end = float(json.loads(request.data)["end"])
        data = price_gen.get_data_time_range(start, end)
        return json.dumps(data)

def stream_data():
    # subscribe
    subs = price_gen.subscribe()
    while True:
        msg = subs.get()
        yield msg


@app.route("/stream")
@cross_origin()
def listen():
  return Response(stream_data(), mimetype='text/event-stream')

if __name__ == "__main__":
  http_server = WSGIServer(("localhost", 80), app)
  http_server.serve_forever()