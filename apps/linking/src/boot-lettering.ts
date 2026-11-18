// Local MiSans/system text replaces the site-specific commercial lettering kit.
export async function loadBootWebfonts(){return false;}
export class BootLettering {
  constructor(private host:HTMLElement,_keys:string[]){host.classList.remove('has-boot-lettering');}
  setText(value:string){this.host.textContent=value;}
  useWebfonts(){}
}
