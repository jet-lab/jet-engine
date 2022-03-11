import { useEffect, useState } from "react"

export class Hooks {
  static usePromise<T>(promiseFactory: () => Promise<T>, deps: React.DependencyList | undefined) {
    const [state, setState] = useState<T | undefined>()

    useEffect(() => {
      let abort = false
      promiseFactory()
        .then(newState => !abort && setState(newState))
        .catch((err: Error) => {
          !abort && setState(undefined)
          if (!err.message.includes(`Account does not exist `)) {
            console.log(err)
          }
        })
      return () => {
        abort = true
      }
    }, deps)

    return state
  }
}
