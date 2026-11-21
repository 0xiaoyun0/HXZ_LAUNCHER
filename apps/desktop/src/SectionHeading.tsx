import type {ReactNode} from 'react';

type Props={title:ReactNode;actions?:ReactNode;className?:string};
export function SectionHeading({title,actions,className=''}:Props){
  return <header className={'section-heading '+className}>
    <h2>{title}</h2>
    {actions&&<div className="heading-actions">{actions}</div>}
  </header>;
}
