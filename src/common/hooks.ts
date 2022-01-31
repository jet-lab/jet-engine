import { useEffect, useState } from "react"

export class Hooks {
  static usePromise<T>(promiseFactory: () => Promise<T>, deps: React.DependencyList | undefined) {
    const [state, setState] = useState<T | undefined>()

    useEffect(() => {
      let abort = false
      promiseFactory()
        .then(newState => !abort && setState(newState))
        .catch(() => {
          !abort && setState(undefined)
        })
      return () => {
        abort = false
      }
    }, deps)

    return state
  }
}
