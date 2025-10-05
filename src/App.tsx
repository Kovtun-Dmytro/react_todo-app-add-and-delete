import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { ErrorNotification } from './components/ErrorNotification';
import { UserWarning } from './UserWarning';
import { Todo, Filter } from './types/Todo';

const USER_ID = 3513;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string>('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [loadingTodoId, setLoadingTodoId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (error) {
      timer = setTimeout(() => setError(''), 3000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [error]);

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    fetch(`https://mate.academy/students-api/todos?userId=${USER_ID}`)
      .then(res => {
        if (!res.ok) {
          throw new Error();
        }

        return res.json();
      })
      .then((data: Todo[]) => setTodos(data))
      .catch(() => setError('Unable to load todos'));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    setIsInputDisabled(true);
    event.preventDefault();

    const title = newTitle.trim();

    if (!title) {
      setError('Title should not be empty');
      setIsInputDisabled(false);
      inputRef.current?.focus();

      return;
    }

    const temp: Todo = { id: 0, userId: USER_ID, title, completed: false };

    setTempTodo(temp);

    try {
      const response = await fetch('https://mate.academy/students-api/todos', {
        method: 'POST',
        body: JSON.stringify({ title, userId: USER_ID, completed: false }),
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
      });

      if (!response.ok) {
        throw new Error();
      }

      const created: Todo = await response.json();

      // sync react state with cypress
      requestAnimationFrame(() => {
        setTodos(prev => [...prev, created]);
        setNewTitle('');
        setIsInputDisabled(false);
        setTempTodo(null);
      });
    } catch {
      setError('Unable to add a todo');
      setTempTodo(null);
      setIsInputDisabled(false);
    } finally {
      // for sync with  cypress
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDelete = async (todoId: number) => {
    setLoadingTodoId(todoId);
    // for sync with cypress
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const res = await fetch(
        `https://mate.academy/students-api/todos/${todoId}`,
        { method: 'DELETE' },
      );

      if (!res.ok) {
        throw new Error();
      }

      setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch {
      setError('Unable to delete a todo');
    } finally {
      setLoadingTodoId(null);
      inputRef.current?.focus();
    }
  };

  const handleClearCompleted = async () => {
    const completed = todos.filter(t => t.completed);

    try {
      await Promise.all(
        completed.map(t =>
          fetch(`https://mate.academy/students-api/todos/${t.id}`, {
            method: 'DELETE',
          }).then(res => {
            if (!res.ok) {
              throw new Error();
            }

            setTodos(prev => prev.filter(item => item.id !== t.id));
          }),
        ),
      );
    } catch {
      setError('Unable to delete a todo');
    } finally {
      await new Promise(resolve => setTimeout(resolve, 50));
      inputRef.current?.focus();
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    setLoadingTodoId(todo.id);
    try {
      const response = await fetch(
        `https://mate.academy/students-api/todos/${todo.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ completed: !todo.completed }),
          headers: { 'Content-type': 'application/json; charset=UTF-8' },
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      const updated: Todo = await response.json();

      setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch {
      setError('Unable to update a todo');
    } finally {
      setLoadingTodoId(null);
    }
  };

  const handleToggleAll = async () => {
    const shouldComplete = !todos.every(t => t.completed);

    try {
      const results = await Promise.allSettled(
        todos.map(todo =>
          fetch(`https://mate.academy/students-api/todos/${todo.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ completed: shouldComplete }),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
          }).then(res => {
            if (!res.ok) {
              throw new Error();
            }

            return res.json();
          }),
        ),
      );

      const updated = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<Todo>).value);

      setTodos(prev => prev.map(t => updated.find(u => u.id === t.id) || t));
    } catch {
      setError('Unable to update todos');
    }
  };

  const visibleTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title" data-cy="AppTitle">
        todos
      </h1>

      <div className="todoapp__content">
        <Header
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          onSubmit={handleSubmit}
          onToggleAll={handleToggleAll}
          loading={isInputDisabled}
          todosCount={todos.length}
          allCompleted={todos.every(t => t.completed)}
          inputRef={inputRef}
        />

        <TodoList
          todos={visibleTodos}
          tempTodo={tempTodo}
          loadingTodoId={loadingTodoId}
          onDelete={handleDelete}
          onToggle={handleToggleStatus}
        />

        {todos.length > 0 && (
          <Footer
            activeCount={todos.filter(t => !t.completed).length}
            filter={filter}
            setFilter={setFilter}
            hasCompleted={todos.some(t => t.completed)}
            onClearCompleted={handleClearCompleted}
          />
        )}
      </div>

      <ErrorNotification error={error} onClose={() => setError('')} />
    </div>
  );
};
