import type {ComponentPropsWithoutRef} from 'react';
export function SpringCheck({onChange,...props}:Omit<ComponentPropsWithoutRef<'input'>,'type'>){
  return <input {...props} type="checkbox" className={'micro-check '+(props.className||'')} onChange={e=>{
    e.currentTarget.dataset.changed='true';onChange?.(e);
  }}/>;
}
