class Machine {
    constructor(data) {
        this.id = data.id;
        this.state = data.initialState;
        this.context = data.context;
        this.states = data.states;
        this.actions = data.actions;
        this.inTransition = false;
        this.transitionQueue = [];
    }
    transition(transaction, event) {
        this.transitionQueue.push([transaction, event]);
        this.checkTransitionQueue();
    }

    doTransition(transaction, event) {
        const transactionBlock = this.states[this.state];
        const transactionOn = transactionBlock.on[transaction];
        if (transactionOn.hasOwnProperty("service"))
        {
            Machine.Stack.push([this, event]);
            try {
                transactionOn.service.call(this, event);    
            }
            finally {
                Machine.Stack.pop();
            }
        }
        else
            setState.call(this, transactionOn.target);
    }
    closeTransition() {
        this.transitionQueue.shift();
        this.inTransition = false;
        this.checkTransitionQueue();
    }
    checkTransitionQueue() {
        if (!this.inTransition && this.transitionQueue.length > 0) {
            this.inTransition = true;
            this.doTransition.apply(this, this.transitionQueue[0]);
        }
    }

    raiseEvent(eventName, eventData) {
        if (this.states[this.state].hasOwnProperty(eventName))
        {
            const action = this.states[this.state][eventName];
            this.doEventAction(eventName, eventData, action);
        }
    }
    doEventAction(eventName, eventData, action) {
        switch(typeof action) {
            case 'string':
                this.actions[action](eventData);
                break;
            case 'function':
                action(eventData);
                break;
            default:
                if (Array.isArray(action)) {
                    for (let subAction of action)
                        this.doEventAction(eventName, eventData, subAction);
                }
                else
                    throw Error("Unknown event type");
        }
    }
}

Machine.Stack = [];
Machine.PeekStack = function() {
    if (Machine.Stack.length <= 0)
        throw Error("Cannot find current machine");
    return Machine.Stack[Machine.Stack.length - 1];
};


function machine(data) {
    return new Machine(data);
}

function setContext(machine, event, context) {
    for (var prop in context)
        machine.context[prop] = context[prop];
}
function useContext() {
    const [currentMachine, event] = Machine.PeekStack();
    return [currentMachine.context, setContext.bind(null, currentMachine, event)];
}
function setState(machine, event, state) {
    if (machine.state === state)
        return;

    Machine.Stack.push([machine, event]);
    try {
        machine.raiseEvent('onExit', event);
        machine.state = state;
        machine.raiseEvent('onEntry', event);
    }
    finally {
        Machine.Stack.pop();
    }
}
function useState() {
    const [currentMachine, event] = Machine.PeekStack();
    return [currentMachine.state, setState.bind(null, currentMachine, event)];
}

function closeTransition(machine) {
    machine.closeTransition();
}
function useTransition() {
    const [currentMachine] = Machine.PeekStack();
    return [closeTransition.bind(null, currentMachine)];
}

// machine — создает инстанс state machine (фабрика)
const vacancyMachine = machine({
    // У каждого может быть свой id
    id: 'vacancy',
    // начальное состояние
    initialState: 'notResponded',
    // дополнительный контекст (payload)
    context: {id: 123},
    // Граф состояний и переходов между ними
    states: {
        // Каждое поле — это возможное состоение
        responded: {
            // action, который нужно выполнить при входе в это состояние. Можно задавать массивом, строкой или функцией
            onEntry: 'onStateEntry'
        },
        notResponded: {
            // action, который нужно выполнить при выходе из этого состояния. Можно задавать массивом, строкой или функцией                         
            onExit() {
                console.log('we are leaving notResponded state');
            },
            // Блок описания транзакций
            on: {
                // Транзакция
                RESPOND: {
                    // упрощенный сервис, вызываем при транзакции
                    service: (event) => {
                        // Позволяет получить текущий контекст и изменить его
                        const [context, setContext] = useContext()            
                        // Позволяет получить текущий стейт и изменить его
                        const [state, setState] = useState();

                        const [closeTransition] = useTransition();

                        // Поддерживаются асинхронные действия
                        window
                            .fetch('https://httpstat.us/200', {method: 'post', data: {resume: event.resume, vacancyId: context.id} })
                            .then((response) => {
                                if (!response.ok)
                                    throw Error(response.statusText);
                                return response;
                            })
                            .then(() => {
                                // меняем состояние
                                setState('responded');
                                // Мержим контекст
                                setContext({completed: true}); // {id: 123, comleted: true}
                                // Закрываем транзакцию
                                closeTransition();
                            })
                            .catch(function(error) {
                                console.log(error);
                                closeTransition();
                            });
                    },
                    // Если не задан сервис, то просто переводим в заданный target, иначе выполняем сервис.
                    target: 'responded'
                }
            }
        }
    },
    // Раздел описание экшенов 
    actions: {
        onStateEntry: (event) => {
            const [state] = useState();
            console.log('now state is ' + state);
        },
        /*makeResponse: (event) => {
            // both sync and async actions
            const [contex, setContext] = useContext()            
            window.fetch({method: 'post', data: {resume: event.resume, vacancyId: context.id} })
        }*/
    }
})

// Пример использования StateMachine
vacancyMachine.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});