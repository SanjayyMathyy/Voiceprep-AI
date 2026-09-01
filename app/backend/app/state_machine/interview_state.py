from enum import Enum
from typing import Set, Dict

class InterviewState(str, Enum):
    IDLE = "IDLE"
    SESSION_CREATED = "SESSION_CREATED"
    PREPARING = "PREPARING"
    ASKING = "ASKING"
    LISTENING = "LISTENING"
    EVALUATING = "EVALUATING"
    FOLLOW_UP_REQUIRED = "FOLLOW_UP_REQUIRED"
    NEXT_QUESTION = "NEXT_QUESTION"
    COMPLETED = "COMPLETED"
    ABORTED = "ABORTED"

# Valid state transitions mapping
VALID_TRANSITIONS: Dict[InterviewState, Set[InterviewState]] = {
    InterviewState.IDLE: {InterviewState.SESSION_CREATED},
    InterviewState.SESSION_CREATED: {InterviewState.PREPARING, InterviewState.ABORTED},
    InterviewState.PREPARING: {InterviewState.ASKING, InterviewState.ABORTED},
    InterviewState.ASKING: {InterviewState.LISTENING, InterviewState.ABORTED},
    InterviewState.LISTENING: {InterviewState.EVALUATING, InterviewState.ABORTED},
    InterviewState.EVALUATING: {
        InterviewState.FOLLOW_UP_REQUIRED,
        InterviewState.NEXT_QUESTION,
        InterviewState.COMPLETED,
        InterviewState.ABORTED
    },
    InterviewState.FOLLOW_UP_REQUIRED: {InterviewState.ASKING, InterviewState.ABORTED},
    InterviewState.NEXT_QUESTION: {InterviewState.ASKING, InterviewState.ABORTED},
    InterviewState.COMPLETED: set(),
    InterviewState.ABORTED: set(),
}

class InvalidStateTransitionError(Exception):
    def __init__(self, current_state: InterviewState, target_state: InterviewState):
        super().__init__(
            f"Invalid transition from '{current_state.value}' to '{target_state.value}'"
        )
        self.current_state = current_state
        self.target_state = target_state

class InterviewStateMachine:
    def __init__(self, initial_state: InterviewState = InterviewState.SESSION_CREATED):
        self._current_state = initial_state

    @property
    def current_state(self) -> InterviewState:
        return self._current_state

    def can_transition_to(self, target_state: InterviewState) -> bool:
        return target_state in VALID_TRANSITIONS.get(self._current_state, set())

    def transition_to(self, target_state: InterviewState) -> InterviewState:
        if not self.can_transition_to(target_state):
            raise InvalidStateTransitionError(self._current_state, target_state)
        self._current_state = target_state
        return self._current_state
