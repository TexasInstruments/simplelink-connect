import Foundation
import NordicMesh

struct BMGenericState<T: Equatable> {

  struct Transition {
    let targetValue: T
    let start: Date
    let delay: TimeInterval
    let duration: TimeInterval

    var startTime: Date {
      return start.addingTimeInterval(delay)
    }

    var remainingTime: TimeInterval {
      let startsIn = startTime.timeIntervalSinceNow
      if startsIn + duration > 0 {
        return startsIn + duration
      } else {
        return 0.0
      }
    }
  }

  struct Move {
    let start: Date
    let delay: TimeInterval
    // Change of value per second.
    let speed: T

    var startTime: Date {
      return start.addingTimeInterval(delay)
    }
  }

  /// A flag indicating whether the state was recalled from a stored Scene.
  let storedWithScene: Bool
  /// The current state.
  let value: T
  /// The transition object.
  let transition: Transition?
  /// The animation object.
  let animation: Move?

  init(_ state: T, storedWithScene: Bool = false) {
    self.value = state
    self.transition = nil
    self.animation = nil
    self.storedWithScene = storedWithScene
  }

  init(
    transitionFrom state: BMGenericState<T>, to targetValue: T,
    delay: TimeInterval, duration: TimeInterval?,
    storedWithScene: Bool = false
  ) {
    self.animation = nil
    self.storedWithScene = storedWithScene
    guard let duration = duration,
      delay > 0 || duration > 0
    else {
      self.value = targetValue
      self.transition = nil
      return
    }
    self.value = state.value
    guard state.transition != nil || state.value != targetValue else {
      self.transition = nil
      return
    }
    self.transition = Self.Transition(
      targetValue: targetValue,
      start: Date(), delay: delay,
      duration: duration)
  }

  init(
    continueTransitionFrom state: BMGenericState<T>, to targetValue: T,
    delay: TimeInterval, duration: TimeInterval?,
    storedWithScene: Bool = false
  ) {
    self.animation = nil
    self.storedWithScene = storedWithScene
    guard let duration = duration,
      delay > 0 || duration > 0
    else {
      self.value = targetValue
      self.transition = nil
      return
    }
    self.value = state.value
    guard state.transition != nil || state.value != targetValue else {
      self.transition = nil
      return
    }
    if let transition = state.transition {
      self.transition = Self.Transition(
        targetValue: targetValue,
        start: transition.start, delay: delay,
        duration: duration)
    } else {
      self.transition = Self.Transition(
        targetValue: targetValue,
        start: Date(), delay: delay,
        duration: duration)
    }
  }

}

extension BMGenericState where T: BinaryInteger {

  init(
    transitionFrom state: BMGenericState<T>, to targetValue: T,
    delay: TimeInterval, duration: TimeInterval?,
    storedWithScene: Bool = false
  ) {
    self.animation = nil
    self.storedWithScene = storedWithScene
    guard let duration = duration,
      delay > 0 || duration > 0
    else {
      self.value = targetValue
      self.transition = nil
      return
    }
    self.value = state.currentValue
    guard state.transition != nil || state.value != targetValue else {
      self.transition = nil
      return
    }
    self.transition = Self.Transition(
      targetValue: targetValue,
      start: Date(), delay: delay,
      duration: duration)
  }

  init(
    continueTransitionFrom state: BMGenericState<T>, to targetValue: T,
    delay: TimeInterval, duration: TimeInterval?,
    storedWithScene: Bool = false
  ) {
    self.animation = nil
    self.storedWithScene = storedWithScene
    guard let duration = duration,
      delay > 0 || duration > 0
    else {
      self.value = targetValue
      self.transition = nil
      return
    }
    self.value = state.currentValue
    guard state.transition != nil || state.value != targetValue else {
      self.transition = nil
      return
    }
    if let transition = state.transition {
      self.transition = Self.Transition(
        targetValue: targetValue,
        start: transition.start, delay: delay,
        duration: duration)
    } else {
      self.transition = Self.Transition(
        targetValue: targetValue,
        start: Date(), delay: delay,
        duration: duration)
    }
  }

  init(
    animateFrom state: BMGenericState<T>, to targetValue: T,
    delay: TimeInterval, duration: TimeInterval?,
    storedWithScene: Bool = false
  ) {
    self.value = state.value
    self.transition = nil
    self.storedWithScene = storedWithScene
    guard let duration = duration,
      state.value != targetValue, duration > 0
    else {
      self.animation = nil
      return
    }
    let speed = Double(targetValue) / duration
    self.animation = Self.Move(
      start: Date(), delay: delay,
      speed: T(truncatingIfNeeded: Int(speed)))
  }

  var currentValue: T {
    if let animation = animation {
      let timeDiff = animation.startTime.timeIntervalSinceNow

      // Is the animation scheduled for the future?
      if timeDiff >= 0 {
        return value
      } else {
        // Otherwise, it has already started.
        return T(
          truncatingIfNeeded: Int(
            Double(value) - timeDiff * Double(animation.speed)))
      }
    } else if let transition = transition {
      let timeDiff = transition.startTime.timeIntervalSinceNow

      // Is the animation scheduled for the future?
      if timeDiff >= 0 {
        return value
      } else if transition.remainingTime == 0 {
        // Has if completed?
        return transition.targetValue
      } else {
        // Otherwise, it's in progress.
        let progress = transition.remainingTime / transition.duration
        let diff = Double(value) - Double(transition.targetValue)
        return T(
          truncatingIfNeeded: Int(transition.targetValue) + Int(diff * progress)
        )
      }
    } else {
      return value
    }
  }

}
