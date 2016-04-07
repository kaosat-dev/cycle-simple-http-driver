import Rx from 'rx'

let isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node
if(isNode){
  const XMLHttpRequest = require("xhr2").XMLHttpRequest
}

export function createResponse$(options){
  const defaults = {
    method:'get'
    ,encoding:'utf8'
    ,mimeType:'text/plain; charset=x-user-defined'
    ,responseType:''
    ,timeout:undefined
    ,send:undefined
  }
  options = Object.assign({}, defaults, options)

  let obs = new Rx.Subject()

  let request = new XMLHttpRequest()

  function handleProgress(e){
    [e]
      .filter(e=>e.lengthComputable)
      .forEach(function(e){
          obs.onNext({progress: (e.loaded / e.total),total:e.total})
      })
  }
  function handleComplete(e){
    let response = request.response
    if(request.responseType === ''  || (request.responseType === 'text' && response === null || response === undefined)){
      response = request.responseText
    }

    const status = parseInt((request.status + '').charAt(0))
    const statusWhiteList = [1,2]//valid http status codes are 1XX or 2XX , nothing else
    if(statusWhiteList.indexOf(status)===-1){
      obs.onError(e)
    }else{
      //response = options.responseType === 'json' ? JSON.parse(response) : response
      obs.onNext({response})
      obs.onCompleted()
    }

  }

  function handleError(e){
    console.log("error in httpDriver",e)
    obs.onError(e)
  }

  function handleAbort(e){
    console.log("abort in httpDriver",e)
    obs.onError(e)
  }

  function handleTimeout(e){
    console.log("timeout in httpDriver",e)
    obs.onError(e)
  }

  request.addEventListener("progress", handleProgress)
  request.addEventListener("load"    , handleComplete)
  request.addEventListener("error"   , handleError)
  request.addEventListener("abort"   , handleError)
  request.addEventListener("timeout" , handleTimeout)


  request.open(options.method,options.url, true)
  if ((options.mimeType !== null) && (request.overrideMimeType !== null)) {
    request.overrideMimeType(options.mimeType)
  }
  request.timeout      = options.timeout
  request.responseType = options.responseType

  request.send(options.send)

  return obs
}


export default function makeHttpDriver({eager = false} = {eager: false}){

  return function httpDriver(request$){
    let response$$ = request$
      .map(reqOptions => {
        let response$ = createResponse$(reqOptions)
        if (eager || reqOptions.eager) {
            response$ = response$.replay(null, 1)
            response$.connect()
        }
        response$.request = reqOptions
        return response$
      })
      .replay(null, 1)
    response$$.connect()
    return response$$
  }
}
