
/// <reference types="es4x" />

const { Router, SockJSHandler } = require('@vertx/web')
const { BridgeOptions, SockJSHandlerOptions } = require('@vertx/web/options')
const { PermittedOptions } = require('@vertx/bridge-common/options')

const bridgeOptions = new BridgeOptions();
bridgeOptions.addInboundPermitted(new PermittedOptions().setAddressRegex("test"))
bridgeOptions.addOutboundPermitted(new PermittedOptions().setAddressRegex("test"))

const router = Router.router(vertx);
const sockHandler = SockJSHandler.create(vertx, new SockJSHandlerOptions());

router.mountSubRouter("/eventbus", sockHandler.bridge(bridgeOptions, handler => {
  const type = handler.type().toString()
  type !== 'SOCKET_PING' && console.log('client eventbus message', handler.type().toString())
  handler.complete(true)
}))

const clientRoute = router.route().path('/client');
clientRoute.handler(req => {
  console.log('here it comes')
  req.response().end(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <script src="https://unpkg.com/sockjs-client@1.4.0/dist/sockjs.js"></script>
        <script src="https://unpkg.com/vertx3-eventbus-client@3.8.5/vertx-eventbus.js"></script>
        <script>
          var client = new EventBus("/eventbus")
          client.onopen = function() { 
            console.log('connected...')

            // this works
            client.send("test", { value: 1 })

            // this doesnt
            client.send("test", { value: [{ one: 1}]})
          }

          window.client = client;
        </script>
      </head>
      <body> loaded ! </body>
    </html>
  `)
})

const eventBus = vertx.eventBus();

eventBus.consumer('test', handler => {
  console.log('test incoming...')
  const { value } = handler.body();

  try {
    // if value isnt an array of objects, this works ->
    console.log('value', value)

    // if the value is an array of objects, this workaround works ->
  } catch (error) {
    console.log('failed to parse value, ', error.message)
    console.log('workaround value', JSON.parse(JSON.stringify(value)))
  }
})

const port = 6006;
const host = "0.0.0.0"

vertx.createHttpServer().requestHandler(router).listen(port, host)

console.log(`Server listening @ http://${host}:${port}/`)